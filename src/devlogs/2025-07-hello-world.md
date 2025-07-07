---
title: "Hello World"
date: "2025-07-05"
tags: ["SRP", "Game Mechanics", "Tools", "Shaders", "Painterly", "Unity", "Latios Framework", "Blender"]
featured: true
image: "https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/stylized+shader.png"
excerpt: ""
---

# Intro

Let me start off by saying welcome and thanks for joining me on this game-making journey. The ultimate goal is to share the knowledge, passion and hard work. 

# Custom Scriptable Render Pipeline w/ DOTS

Alright, so I'm actually cheating a bit on this first entry, as I am including some work from May, as well. One of the things that is of great importance to me as I work on this project, is achieving a unique art style. Now, trust me when I tell you, I couldn't draw a symmetrical stick figure if Picasso himself rose from the grave to tutor me...but what I do have is a decent understanding of the rasterization process and how to write shaders. And its a good thing too because so much of the art pipeline can be controlled via code.

Enter, stage left, the scriptable render pipeline. In Unity, the scriptable render pipeline is the mechanism which determines how lights, shadows, volumetric effects, transparency, post-processing effects, etc. are drawn to the screen. As you all likely know, by default Unity provides a couple setups: HDRP and URP, each with their own strengths and weaknesses. But what if we're looking for a more custom solution to mold and bend to your will? Well, Monsieur Catlike Coding has us covered[^1].

![Catlike Coding Custom SRP Image](https://catlikecoding.com/unity/custom-srp/5-0-0/tutorial-image.jpg)

His tutorials goes step-by-step, explaining everything from Forward+ rendering to shadows and light maps. It was even updated recently to work with Unity 6.1[^2]! However, there was 1 thing missing that I needed desperately: support for Unity DOTS. 

So I can help you avoid that feeling of disappointment when start your scene and see nothing but a skybox, I'll quickly explain the few modifications and additions needed to support the rendering of entities in a scriptable render pipeline for anyone that follows Catlike's tutorial. The first, is an hlsl file taken directly from the URP shader library:


```hlsl
#ifndef CUSTOM_DOTS_INSTANCING_INCLUDED
#define CUSTOM_DOTS_INSTANCING_INCLUDED

// Taken from /Library/PackageCache/com.unity.render-pipelines.universal@2b33a11d06a4/ShaderLibrary/UniversalDOTSInstancing.hlsl

#ifdef UNITY_DOTS_INSTANCING_ENABLED

#undef unity_ObjectToWorld
#undef unity_WorldToObject
#undef unity_MatrixPreviousM
#undef unity_MatrixPreviousMI

UNITY_DOTS_INSTANCING_START(BuiltinPropertyMetadata)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float3x4, unity_ObjectToWorld)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float3x4, unity_WorldToObject)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float4,   unity_SpecCube0_HDR)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float4,   unity_LightmapST)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float4,   unity_LightmapIndex)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float4,   unity_DynamicLightmapST)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float3x4, unity_MatrixPreviousM)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(float3x4, unity_MatrixPreviousMI)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(SH,       unity_SHCoefficients)
    UNITY_DOTS_INSTANCED_PROP_OVERRIDE_SUPPORTED(uint2,    unity_EntityId)
UNITY_DOTS_INSTANCING_END(BuiltinPropertyMetadata)

#define unity_LODFade               LoadDOTSInstancedData_LODFade()
#define unity_SpecCube0_HDR         UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_CUSTOM_DEFAULT(float4, unity_SpecCube0_HDR, unity_DOTS_SpecCube0_HDR)
#define unity_LightmapST            UNITY_ACCESS_DOTS_INSTANCED_PROP(float4,   unity_LightmapST)
#define unity_LightmapIndex         UNITY_ACCESS_DOTS_INSTANCED_PROP(float4,   unity_LightmapIndex)
#define unity_DynamicLightmapST     UNITY_ACCESS_DOTS_INSTANCED_PROP(float4,   unity_DynamicLightmapST)
#define unity_SHAr                  LoadDOTSInstancedData_SHAr()
#define unity_SHAg                  LoadDOTSInstancedData_SHAg()
#define unity_SHAb                  LoadDOTSInstancedData_SHAb()
#define unity_SHBr                  LoadDOTSInstancedData_SHBr()
#define unity_SHBg                  LoadDOTSInstancedData_SHBg()
#define unity_SHBb                  LoadDOTSInstancedData_SHBb()
#define unity_SHC                   LoadDOTSInstancedData_SHC()
#define unity_ProbesOcclusion       LoadDOTSInstancedData_ProbesOcclusion()
#define unity_LightData             LoadDOTSInstancedData_LightData()
#define unity_WorldTransformParams  LoadDOTSInstancedData_WorldTransformParams()
#define unity_RenderingLayer        LoadDOTSInstancedData_RenderingLayer()
#define unity_MotionVectorsParams   LoadDOTSInstancedData_MotionVectorsParams() 

#define UNITY_SETUP_DOTS_SH_COEFFS  SetupDOTSSHCoeffs(UNITY_DOTS_INSTANCED_METADATA_NAME(SH, unity_SHCoefficients))
#define UNITY_SETUP_DOTS_RENDER_BOUNDS  SetupDOTSRendererBounds(UNITY_DOTS_MATRIX_M)

// For probe/shading data not directly instanced, provide safe fallbacks:
static const float4 unity_ProbeVolumeParams = float4(0,0,0,0);
static const float4x4 unity_ProbeVolumeWorldToObject = float4x4(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
static const float4 unity_ProbeVolumeSizeInv = float4(1,1,1,1);
static const float4 unity_ProbeVolumeMin = float4(0,0,0,0);

#endif
#endif // CUSTOM_DOTS_INSTANCING_INCLUDED
```

This should go in your custom srp's shader library.

Next we'll need to hop in the Common.hlsl and include the DOTSInstancing shader after UnityInstancing.

```hlsl
#include "UnityInput.hlsl"
#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl"
#include "../ShaderLibrary/CustomDOTSInstancing.hlsl"
#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/SpaceTransforms.hlsl"
#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Packing.hlsl"
```

We also need to update our various input shaders(the ones that take in the material properties, so LitInput, UnlitInput, etc) to make them compatible with DOTS:

```hlsl
CBUFFER_START(UnityPerMaterial)
float4 _BaseMap_ST;
float4 _DetailMap_ST;
float4 _BaseColor;
float4 _EmissionColor;
float _Cutoff;
float _ZWrite;
float _Metallic;
float _Occlusion;
float _Smoothness;
float _Fresnel;
float _DetailAlbedo;
float _DetailSmoothness;
float _DetailNormalScale;
float _NormalScale;
float _Surface;
/*
 * Testing distortion
 */
float _DistortStrength;
float _TimeValue;

CBUFFER_END


#ifdef UNITY_DOTS_INSTANCING_ENABLED

UNITY_DOTS_INSTANCING_START(MaterialPropertyMetadata)
	UNITY_DOTS_INSTANCED_PROP(float4, _BaseMap_ST)
	UNITY_DOTS_INSTANCED_PROP(float4, _DetailMap_ST)
	UNITY_DOTS_INSTANCED_PROP(float4, _BaseColor)
	UNITY_DOTS_INSTANCED_PROP(float4, _EmissionColor)
	UNITY_DOTS_INSTANCED_PROP(float, _Cutoff)
	UNITY_DOTS_INSTANCED_PROP(float, _ZWrite)
	UNITY_DOTS_INSTANCED_PROP(float, _Metallic)
	UNITY_DOTS_INSTANCED_PROP(float, _Occlusion)
	UNITY_DOTS_INSTANCED_PROP(float, _Smoothness)
	UNITY_DOTS_INSTANCED_PROP(float, _Fresnel)
	UNITY_DOTS_INSTANCED_PROP(float, _DetailAlbedo)
	UNITY_DOTS_INSTANCED_PROP(float, _DetailSmoothness)
	UNITY_DOTS_INSTANCED_PROP(float, _DetailNormalScale)
	UNITY_DOTS_INSTANCED_PROP(float, _NormalScale)
	/*
 * Testing distortion shader
 */
	UNITY_DOTS_INSTANCED_PROP(float, _DistortStrength)
	UNITY_DOTS_INSTANCED_PROP(float, _TimeValue)
UNITY_DOTS_INSTANCING_END(MaterialPropertyMetadata)

static float4 unity_DOTS_Sampled_BaseMap_ST;
static float4 unity_DOTS_Sampled_DetailMap_ST;
static float4 unity_DOTS_Sampled_BaseColor;
static float4 unity_DOTS_Sampled_EmissionColor;
static float  unity_DOTS_Sampled_Cutoff;
static float  unity_DOTS_Sampled_ZWrite;
static float  unity_DOTS_Sampled_Metallic;
static float  unity_DOTS_Sampled_Occlusion;
static float  unity_DOTS_Sampled_Smoothness;
static float  unity_DOTS_Sampled_Fresnel;
static float  unity_DOTS_Sampled_DetailAlbedo;
static float  unity_DOTS_Sampled_DetailSmoothness;
static float  unity_DOTS_Sampled_DetailNormalScale;
static float  unity_DOTS_Sampled_NormalScale;
/*
 * Testing distortion
 */

static float  unity_DOTS_Sampled_DistortStrength;
static float  unity_DOTS_Sampled_TimeValue;


void SetupDOTSLitMaterialPropertyCaches()
{
	unity_DOTS_Sampled_BaseMap_ST = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float4, _BaseMap_ST);
	unity_DOTS_Sampled_DetailMap_ST = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float4, _DetailMap_ST);
	unity_DOTS_Sampled_BaseColor = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float4, _BaseColor);
	unity_DOTS_Sampled_EmissionColor = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float4, _EmissionColor);
	unity_DOTS_Sampled_Cutoff = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _Cutoff);
	unity_DOTS_Sampled_ZWrite = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _ZWrite);
	unity_DOTS_Sampled_Metallic = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _Metallic);
	unity_DOTS_Sampled_Occlusion = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _Occlusion);
	unity_DOTS_Sampled_Smoothness = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _Smoothness);
	unity_DOTS_Sampled_Fresnel = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _Fresnel);
	unity_DOTS_Sampled_DetailAlbedo = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _DetailAlbedo);
	unity_DOTS_Sampled_DetailSmoothness = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _DetailSmoothness);
	unity_DOTS_Sampled_DetailNormalScale = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _DetailNormalScale);
	unity_DOTS_Sampled_NormalScale = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _NormalScale);
		
	// Testing distortion
	unity_DOTS_Sampled_DistortStrength = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _DistortStrength);
	unity_DOTS_Sampled_TimeValue = UNITY_ACCESS_DOTS_INSTANCED_PROP_WITH_DEFAULT(float, _TimeValue);

}

#undef UNITY_SETUP_DOTS_MATERIAL_PROPERTY_CACHES
#define UNITY_SETUP_DOTS_MATERIAL_PROPERTY_CACHES() SetupDOTSLitMaterialPropertyCaches()

#define _BaseMap_ST             unity_DOTS_Sampled_BaseMap_ST
#define _DetailMap_ST           unity_DOTS_Sampled_DetailMap_ST
#define _BaseColor              unity_DOTS_Sampled_BaseColor
#define _EmissionColor          unity_DOTS_Sampled_EmissionColor
#define _Cutoff                 unity_DOTS_Sampled_Cutoff
#define _ZWrite                 unity_DOTS_Sampled_ZWrite
#define _Metallic               unity_DOTS_Sampled_Metallic
#define _Occlusion              unity_DOTS_Sampled_Occlusion
#define _Smoothness             unity_DOTS_Sampled_Smoothness
#define _Fresnel                unity_DOTS_Sampled_Fresnel
#define _DetailAlbedo           unity_DOTS_Sampled_DetailAlbedo
#define _DetailSmoothness       unity_DOTS_Sampled_DetailSmoothness
#define _DetailNormalScale      unity_DOTS_Sampled_DetailNormalScale
#define _NormalScale            unity_DOTS_Sampled_NormalScale
#define _DistortStrength		unity_DOTS_Sampled_DistortStrength
#define _TimeValue				unity_DOTS_Sampled_TimeValue
#endif
```

Also, be sure to remove the normal instancing buffer and replace each instance of the input properties with their DOTS counterpart:

```hlsl
/*

UNITY_INSTANCING_BUFFER_START(UnityPerMaterial)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseMap_ST)
	UNITY_DEFINE_INSTANCED_PROP(float4, _DetailMap_ST)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseColor)
	UNITY_DEFINE_INSTANCED_PROP(float4, _EmissionColor)
	UNITY_DEFINE_INSTANCED_PROP(float, _Cutoff)
	UNITY_DEFINE_INSTANCED_PROP(float, _ZWrite)
	UNITY_DEFINE_INSTANCED_PROP(float, _Metallic)
	UNITY_DEFINE_INSTANCED_PROP(float, _Occlusion)
	UNITY_DEFINE_INSTANCED_PROP(float, _Smoothness)
	UNITY_DEFINE_INSTANCED_PROP(float, _Fresnel)
	UNITY_DEFINE_INSTANCED_PROP(float, _DetailAlbedo)
	UNITY_DEFINE_INSTANCED_PROP(float, _DetailSmoothness)
	UNITY_DEFINE_INSTANCED_PROP(float, _DetailNormalScale)
	UNITY_DEFINE_INSTANCED_PROP(float, _NormalScale)
UNITY_INSTANCING_BUFFER_END(UnityPerMaterial)
*/

//#define INPUT_PROP(name) UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, name)

...

float2 TransformBaseUV(float2 baseUV)
{
	//float4 baseST = INPUT_PROP(_BaseMap_ST);
	float4 baseST = _BaseMap_ST;
	return baseUV * baseST.xy + baseST.zw;
}
```

Finally, add the target 4.5 and DOTS_INSTANCING_ON directives to the passes that will use it:

![Shader Requirements Image](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/shader-dots-requirements.png)

And...BOOM! Now you have all the custom SRP goodness, but now you can render DOTS entities. It is actually pretty simple. It took a day of rummaging through Unity's URP and Render Pipelines Core packages to figure it out.


# Time Fields

## Experimentation
Another hold over from the previous month was my work on "time field generators". Essentially, I wanted a game mechanic where any object in the world could have one of these generators applied to it, and thus alter the how surrounding objects - within a certain distance - are affected by time. This could be speeding them up, slowing them down or completely freezing them in place. I started by adding an experimental **timescale** parameter to rigid bodies in the physics system. Timescale is a float that we'll use to scale deltatime in the physics calculations. Note that I am using a physics system that was created using the Latios Framework[^3], more specifically using an add on called Anna[^4]. If you are at all interested in highly performant code and a great Unity DOTS community, I suggest checking out the Latios Framework [discord](https://discord.gg/acgzY77K).

![Anna Rigid Body - TimeScale - Inspector Image](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/anna-rigidbody-timescale.png)

This lead to some code changes in the building of the rigid body collision layer system, as it relates to gravity and impulses:

```csharp
float scaledGravityFactor = rigidBody.timeScale * rigidBody.timeScale;
rigidBody.velocity.linear += physicsSettings.gravity * dt * scaledGravityFactor;
if (impulses.Length > 0)
{
    foreach (var impulse in impulses[i])
    {
        if (impulse.pointImpulseOrZero.Equals(float3.zero))
            UnitySim.ApplyFieldImpulse(ref rigidBody.velocity, in mass, impulse.pointOrField * rigidBody.timeScale);
        else
            UnitySim.ApplyImpulseAtWorldPoint(ref rigidBody.velocity, in mass, in inertialPoseWorldTransform, impulse.pointOrField, impulse.pointImpulseOrZero * rigidBody.timeScale);
    }
    impulses[i].Clear();
}

...

states[index] = new CapturedRigidBodyState
{
    angularDamping                     = physicsSettings.angularDamping,
    angularExpansion                   = angularExpansion,
    bucketIndex                        = bucketIndex,
    coefficientOfFriction              = rigidBody.coefficientOfFriction,
    coefficientOfRestitution           = rigidBody.coefficientOfRestitution,
    gravity                            = physicsSettings.gravity,
    inertialPoseWorldTransform         = inertialPoseWorldTransform,
    linearDamping                      = physicsSettings.linearDamping,
    mass                               = mass,
    motionExpansion                    = motionExpansion,
    motionStabilizer                   = UnitySim.MotionStabilizer.kDefault,
    numOtherSignificantBodiesInContact = 0,
    velocity                           = rigidBody.velocity,
    timeScale                          = rigidBody.timeScale,
};
```

I also needed to change how time was integrated:

```csharp
UnitySim.Integrate(ref state.inertialPoseWorldTransform, ref state.velocity, state.linearDamping, state.angularDamping, deltaTime * rigidBody.timeScale);
```

And figure out how to handle objects with different timescales that come into contact with each other:

```csharp
float combinedTimeScale = math.min(rigidBodyA.timeScale, rigidBodyB.timeScale);
float finalTimescale = deltaTime * combinedTimeScale;
//float finalInverse = math.rcp(finalTimescale);

UnitySim.BuildJacobian(streamData.contactParameters.AsSpan(),
                       out streamData.bodyParameters,
                       rigidBodyA.inertialPoseWorldTransform,
                       in rigidBodyA.velocity,
                       in rigidBodyA.mass,
                       rigidBodyB.inertialPoseWorldTransform,
                       in rigidBodyB.velocity,
                       in rigidBodyB.mass,
                       contacts.contactNormal,
                       contacts.AsSpan(),
                       coefficientOfRestitution,
                       coefficientOfFriction,
                       UnitySim.kMaxDepenetrationVelocityDynamicDynamic,
                       math.max(0f, math.max(math.dot(rigidBodyA.gravity, -contacts.contactNormal), -math.dot(rigidBodyB.gravity, -contacts.contactNormal))),
                       finalTimescale,
                       inverseDeltaTime / combinedTimeScale);
```

Ok, I've messed around with some physics calculations that I don't fully understand. Now its time to go see what happens...

![Video of balls moving at different timescales](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/timescaled-gravity-balls.gif)

Well, alright. The physics system didn't break apart and it seems the timescale idea actually worked. Time to move on to the actual time field game mechanic.

## Building the mechanic

All in all, this didn't require too much effort. I needed a couple collision layer systems: one for the time fields themselves and another for objects that are *sensitive* to the effects of time. I figured this would be important to have, as I may not want all rigid bodies to be affected by time modifications. In additon, I setup authoring for the generators and time sensitive objects.

This is what I decided to go with for the time being on the TimeFieldGenerator component. I'll likely expand it in the future. FieldStability and FieldFalloffCurve are enums that aren't implemented yet, but I plan to use them to add modifications to how a time generator functions.
```csharp
public struct TimeFieldGenerator : IComponentData
{
    //Shape
    public float Multiplier;
    public float Duration;
    public float Cooldown;
    public FieldStability Stability;
    public FieldFalloffCurve FalloffCurve;

}
```

I also like the idea of time effects accumulating if an object is in overlapping zones, so I made a component with that in mind.

```csharp
public struct TimeEffectsInfo : IComponentData
{
    public float TimeScaleAccumulated;
    public int ZoneCount;
}
```

![Time Gen - Inspector View](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/time-field-inspector.png)

In the future, perhpas I'll go more in-depth with how the underlying systems work, but for now I fear this blog has already gone on long enough and I haven't even gotten to what I've done this month. So let's move on and do some tests! Well use a sphere with a circuitry texture to denote the location of our time gen fields
First we'll set the multiplier to 0.1.

![Time Gen Test Slow](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/time-field-slow.gif)

Then we'll increase it to 1.5.

![Time Gen Test Fast](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/time-field-fast.gif)

Finally, we'll test out the accumulation by overlapping the zones of 2 time field generators. I'll set one to 0.1 and the other to 1.5. Where they overlap, the values would multiply together to get the final timescale.

*NOTE: I did have an example gif of this, but I realized that it is quite difficult to see. I'll have to reupload this.*

Looking good, but I have a confession. A question has been stirring deep within me since I started this whole time escapade and it may have been gnawing at you too. What happens if we make the multiplier negative? I'll set it to something really small: -0.15 should do.
![Time Gen Test Negative](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/time-field-neg.gif)

Quite surprisingly, that worked, but with a little caveat. It seems that once the rigid body reaches the boundary of the field, normal physics(including gravity) takes over, but because time is being reversed, as soon as it falls back within range of the field it wants to go back up, resulting in the jerky movement we saw there at the end. As I continue to flesh out the system, that's something I'll have to figure out.

#Dev Mode

Having a developer mode where I can toggle debug displays and other information was a big focus for me. And I can proudly say it was accomplished:

![Dev Mode Switching GIF](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/devmode.gif)

With the completion of this handy ability, I can now toggle debug info for a 3D navigation system I've been trying to make for awhile now.

*Sparse Voxel Octree Debug View:*
![SVO Debug](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/sparse-voxel-octree.png)

The areas where you see the large clusters just indicate that I have identified that object as an obstacle in the navigation system. The different colors you see are different levels of the octree, each level subdividing into 8. I may go into more depth as to how this works in the future.

*Navigation Obstacles & Their Voxel Representation at the Lowest Level:*
![Nav Obstacle 1](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/svo-obstacle-1.png)

![Nav Obstacle 2](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/svo-obstacle-2.png)

![Nav Obstacle 3](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/svo-obstacle-3.png)

*It even updates in real time!*
![Nav Obstacle Moving](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/svo-obstacle-moving.gif)


# Stylized & Painterly

On my quest, to find a unique look for my game, I spent a couple weeks looking through blender tutorials, watching movies, etc. and I discovered I have a particular appreciation for game **Sifu**, the League of Legends show **Arcane**, the movie **Flow** and the recent **Predator: Killer of Killers**. Besides all being brilliant pieces of media in their own right - my humble opinion, of course - what they all achieve so outstandingly is the painterly look. 

*Sifu*
![Sifu Screen](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/sifu-screenshot-arena.jpg)
*Source: https://news.xbox.com/en-us/2023/03/29/sifu-xbox-arena-mode-future/*


*Predator: Killer of Killers*
![Predator Screen](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/Warlord-Predator.jpg)
*Source: https://bloody-disgusting.com/interviews/3872147/predator-killer-of-killers-naru/*

Eventually, I stumbled upon someone using an interesting technique in blender[^5][^6], and the shader they used is absolutely free! I spent a couple days attempting to mimic their blender shaders in Unity, and - aside from lighting, which will be its own beast to figure out - I think I got close with this sphere:

![Painterly Look - Sphere Test](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/stylized-shaders-and-light.gif)

## Bake Tool

Attempt at making a baking tool in Unity. Eventually just decided it was easier to use this developer's blender tool and just recreate the final shader in hlsl.

![Psuedo Painter Bake Tool](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/pseudopainter-tool.png)

## SRP Manager Tool

Eventually, I grew tired of manually switching all of the parameters required when moving between render pipelines, so I made a handy tool to do it with the press of a button.

![SRP Manager Tool](https://alleriumlabs-devlog-content.s3.us-west-2.amazonaws.com/project-facility/2025-06/SRP+Manager+Tool.png)

*Thanks for reading! Feel free to reach out with questions or feedback.*

> "Stay Frosty" 
> — Corporal Hicks, 2179

---



# Resources & References

[^1]: [Catlike Coding Custom SRP Tutorial](https://catlikecoding.com/unity/tutorials/custom-srp/) - Excellent resource if you want to have more control over how the render pipeline works
[^2]: [Catlike Coding Custom SRP Upgrade to Unity 6.1](https://catlikecoding.com/unity/custom-srp/5-0-0/)
[^3]: [Latios Framework Docs](https://github.com/Dreaming381/Latios-Framework-Documentation)
[^4]: [Latios Framework Add Ons](https://github.com/Dreaming381/Latios-Framework-Add-Ons)
[^5]: [Pseudo Painter Video Walkthrough](https://www.youtube.com/watch?v=J7m2AXP2_pY)
[^6]: [Pseudo Painter Tool Download](https://barelyart.gumroad.com/l/pseudopainter2)
